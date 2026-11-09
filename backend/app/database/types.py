"""Portable JSON validity checks for the legacy text-backed JSON columns."""
from sqlalchemy import Boolean
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import GenericFunction


class JsonValid(GenericFunction):
    type = Boolean()
    name = "json_valid"
    inherit_cache = True


@compiles(JsonValid, "postgresql")
def postgres_json_valid(element, compiler, **kwargs):
    value = compiler.process(list(element.clauses)[0], **kwargs)
    return f"({value} IS JSON)"
