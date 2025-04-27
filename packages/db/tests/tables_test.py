import pytest
from sqlalchemy import Integer, String
from sqlalchemy.orm import mapped_column

from packages.db.src.tables import Base


class DummyModel(Base):
    __tablename__ = "dummy_model"
    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String)


@pytest.fixture
def dummy_instance() -> DummyModel:
    return DummyModel(id=1, name="foo")


def test_to_dict(dummy_instance: DummyModel) -> None:
    d = dummy_instance.to_dict()
    assert d["id"] == 1
    assert d["name"] == "foo"
    assert "created_at" in d
    assert "updated_at" in d
