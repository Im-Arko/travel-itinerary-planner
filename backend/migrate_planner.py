"""Add planner v2 tables/columns on MariaDB/MySQL with an owner's credentials.

Back up before --apply: MariaDB DDL commits implicitly. No rows are deleted.
For Supabase use the versioned SQL migration instead (it also sets RLS/grants).
"""
import argparse
from sqlalchemy import inspect, MetaData, text
from sqlalchemy.schema import CreateTable
from app.database.models import PlanningRequest
from app.database.session import engine


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    with engine.connect() as connection:
        if connection.dialect.name != 'mysql':
            raise SystemExit('Use supabase/migrations/20261110201831_planner_v2.sql for PostgreSQL.')
        inspector = inspect(connection)
        statements = []
        for table, column, kind in [('user_preferences','planning_details','JSON'), ('destination_embeddings','model_revision','VARCHAR(64)')]:
            if column not in {item['name'] for item in inspector.get_columns(table)}:
                statements.append(f'ALTER TABLE {table} ADD COLUMN {column} {kind}')
        for table, column, name in [('itineraries','destination_id','idx_itin_destination'), ('refresh_tokens','user_id','ix_refresh_tokens_user_id')]:
            if not any(index['column_names'] == [column] for index in inspector.get_indexes(table)):
                statements.append(f'CREATE INDEX {name} ON {table} ({column})')
        new_table = None
        if not inspector.has_table('planning_requests'):
            new_table = PlanningRequest.__table__.to_metadata(MetaData())
            # Older schema.sql installations use unsigned IDs. Foreign keys
            # must match the installed ID type without rewriting existing rows.
            for column, target in [('user_id','users'), ('itinerary_id','itineraries')]:
                new_table.c[column].type = next(item['type'] for item in inspector.get_columns(target) if item['name'] == 'id')
            # Include referred tables for SQLAlchemy foreign-key resolution.
            for name in ('users','itineraries'):
                from sqlalchemy import Table
                Table(name, new_table.metadata, autoload_with=connection)
        for statement in statements:
            print(('APPLY: ' if args.apply else 'PLAN: ') + statement)
        if new_table is not None:
            print(('APPLY: ' if args.apply else 'PLAN: ') + str(CreateTable(new_table).compile(dialect=connection.dialect)))
        if args.apply:
            for statement in statements:
                connection.execute(text(statement))
            if new_table is not None:
                new_table.create(connection)
            connection.commit()
        print('Planner schema is current.' if not statements and new_table is None else 'Migration applied.' if args.apply else 'Audit only; back up and use --apply with migration credentials.')


if __name__ == '__main__':
    main()
