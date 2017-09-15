// Copyright (c) 2016-2017 Chef Software Inc. and/or applicable contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use db::migration::Migrator;

use error::SrvResult;

pub fn migrate(migrator: &mut Migrator) -> SrvResult<()> {
    migrator.migrate(
        "accountsrv",
        r#"CREATE SEQUENCE IF NOT EXISTS accounts_id_seq;"#,
    )?;
    migrator.migrate(
        "accountsrv",
        r#"CREATE TABLE IF NOT EXISTS accounts (
                        id bigint PRIMARY KEY DEFAULT next_id_v1('accounts_id_seq'),
                        name text UNIQUE,
                        email text UNIQUE,
                        created_at timestamptz DEFAULT now(),
                        updated_at timestamptz
                        )"#,
    )?;
    migrator.migrate("accountsrv",
                 r#"CREATE OR REPLACE FUNCTION select_or_insert_account_v1 (
                    account_name text,
                    account_email text
                 ) RETURNS SETOF accounts AS $$
                     DECLARE
                        existing_account accounts%rowtype;
                     BEGIN
                        SELECT * INTO existing_account FROM accounts WHERE name = account_name LIMIT 1;
                        IF FOUND THEN
                            RETURN NEXT existing_account;
                        ELSE
                            RETURN QUERY INSERT INTO accounts (name, email) VALUES (account_name, account_email) ON CONFLICT DO NOTHING RETURNING *;
                        END IF;
                        RETURN;
                     END
                 $$ LANGUAGE plpgsql VOLATILE"#)?;
    migrator.migrate(
        "accountsrv",
        r#"CREATE OR REPLACE FUNCTION get_account_by_name_v1 (
                    account_name text
                 ) RETURNS SETOF accounts AS $$
                     BEGIN
                        RETURN QUERY SELECT * FROM accounts WHERE name = account_name;
                        RETURN;
                     END
                 $$ LANGUAGE plpgsql STABLE"#,
    )?;
    migrator.migrate(
        "accountsrv",
        r#"CREATE OR REPLACE FUNCTION get_account_by_id_v1 (
                    account_id bigint
                 ) RETURNS SETOF accounts AS $$
                     BEGIN
                        RETURN QUERY SELECT * FROM accounts WHERE id = account_id;
                        RETURN;
                     END
                 $$ LANGUAGE plpgsql STABLE"#,
    )?;
    migrator.migrate(
        "accountsrv",
        r#"CREATE TABLE IF NOT EXISTS account_origins (
                        account_id bigint,
                        account_name text,
                        origin_id bigint,
                        origin_name text,
                        created_at timestamptz DEFAULT now(),
                        updated_at timestamptz,
                        UNIQUE(account_id, origin_id)
                        )"#,
    )?;
    migrator.migrate("accountsrv",
                 r#"CREATE OR REPLACE FUNCTION insert_account_origin_v1 (
                    o_account_id bigint,
                    o_account_name text,
                    o_origin_id bigint,
                    o_origin_name text
                 ) RETURNS void AS $$
                     BEGIN
                        INSERT INTO account_origins (account_id, account_name, origin_id, origin_name) VALUES (o_account_id, o_account_name, o_origin_id, o_origin_name);
                     END
                 $$ LANGUAGE plpgsql VOLATILE"#)?;
    migrator.migrate(
        "accountsrv",
        r#"CREATE OR REPLACE FUNCTION get_account_origins_v1 (
                    in_account_id bigint
                 ) RETURNS SETOF account_origins AS $$
                     BEGIN
                        RETURN QUERY SELECT * FROM account_origins WHERE account_id = in_account_id;
                        RETURN;
                     END
                 $$ LANGUAGE plpgsql STABLE"#,
    )?;

    // Right, so what's going on with this massive and seemingly overcomplicated function? This
    // function was introduced as part of a change that switched the routing key for sessions from
    // account name (which was never used) to account token (which was the only thing we ever used
    // to identify a session). Previous to this change, every session hashed to shard 37, which is
    // what the empty string "" (account name) hashes to. Now, sessions will hash to different
    // shards based then they did before. As a result, accounts that have already been created an
    // have existed for awhile will get directed to a new shard. This will break many things, such
    // as the origin_members table in originsrv, which maps accounts to origins. This function
    // attempts to rectify this problem.
    //
    // As before, first we check to see if an account already exists in our current shard. If so,
    // terrific - we just return it. That behavior is unchanged. If it's not found, then we loop
    // through every shard, and for each one, we perform the same check as before. If we find an
    // account, then we grab the info for it and insert it into our current shard. That way, we can
    // preserve people's current info, namely account id. If we never find it on any shard, then it
    // must be a brand new account and we create it like normal.
    migrator.migrate("accountsrv",
                 r#"CREATE OR REPLACE FUNCTION select_or_insert_account_v2 (
                    account_name text,
                    account_email text
                 ) RETURNS SETOF accounts AS $$
                     DECLARE
                        existing_account RECORD;
                        schema RECORD;
                        q TEXT;
                        n integer;
                     BEGIN
                        SELECT * INTO existing_account FROM accounts WHERE name = account_name LIMIT 1;
                        IF FOUND THEN
                            RAISE NOTICE 'Found an existing account on the first try - %', existing_account;
                            RETURN NEXT existing_account;
                        ELSE
                            FOR schema IN EXECUTE
                                format(
                                  'SELECT schema_name FROM information_schema.schemata WHERE left(schema_name, 6) = %L',
                                  'shard_'
                                )
                            LOOP
                                RAISE NOTICE 'Checking % for an account that matches %', schema.schema_name, account_name;
                                q := format('SELECT * FROM %I.accounts WHERE name = %L LIMIT 1', schema.schema_name, account_name);
                                RAISE NOTICE 'Query = %', q;
                                EXECUTE q INTO existing_account;
                                GET DIAGNOSTICS n = ROW_COUNT;
                                RAISE NOTICE 'Rows = %', n;
                                IF n = 1 THEN
                                    RAISE NOTICE 'Found an existing account on % - %', schema.schema_name, existing_account;
                                    q := format('INSERT INTO accounts (id, name, email) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING RETURNING *', existing_account.id, existing_account.name, existing_account.email);
                                    RAISE NOTICE 'Insert query = %', q;
                                    EXECUTE q INTO existing_account;
                                    RETURN NEXT existing_account;
                                    EXIT;
                                ELSE
                                    RAISE NOTICE 'NOT FOUND on %', schema.schema_name;
                                END IF;
                            END LOOP;

                            IF n = 0 THEN
                              RAISE NOTICE 'Looped through all the schemas and did not find any accounts matching %. Creating a brand new one.', account_name;
                              RETURN QUERY INSERT INTO accounts (name, email) VALUES (account_name, account_email) ON CONFLICT DO NOTHING RETURNING *;
                            END IF;
                        END IF;
                        RETURN;
                     END
                 $$ LANGUAGE plpgsql VOLATILE"#)?;
    Ok(())
}
