from app.ingest.models import fooModel, barModel, Foo, Bar
from moose_lib import DeadLetterModel, TransformConfig
from datetime import datetime
from typing import Optional

# Transforms Foo to Bar with a way to force errors.

def foo_to_bar(foo: Foo) -> Bar:
    if "fail" in foo.tags:
        raise ValueError(f"Transform failed for item {foo.id}: Item marked as failed")

    return Bar(
        id=foo.id,
        name=foo.name,
        description=foo.description,
        status=foo.status,
        priority=foo.priority,
        is_active=foo.is_active,
        tags=foo.tags,
        score=foo.score,
        large_text=foo.large_text,
        transform_timestamp=datetime.now().isoformat()
    )

fooModel.get_stream().add_transform(
    destination=barModel.get_stream(),
    transformation=foo_to_bar,
    config=TransformConfig(
        dead_letter_queue=fooModel.get_dead_letter_queue()
    )
)

# Fixes the dead letter queue items from Foo to Bar

def invalid_foo_to_bar(dead_letter: DeadLetterModel[Foo]) -> Optional[Bar]:
    try:
        original_foo = dead_letter.as_typed()

        if "Item marked as failed" in dead_letter.error_message and "fail" in original_foo.tags:
            original_foo.tags.remove("fail")

        return Bar(
            id=original_foo.id,
            name=original_foo.name,
            description=original_foo.description,
            status=original_foo.status,
            priority=original_foo.priority,
            is_active=original_foo.is_active,
            tags=original_foo.tags,
            score=original_foo.score,
            large_text=original_foo.large_text,
            transform_timestamp=datetime.now().isoformat()
        )
    except Exception as error:
        print(f"Recovery failed: {error}")
        return None

fooModel.get_dead_letter_queue().add_transform(
    destination=barModel.get_stream(),
    transformation=invalid_foo_to_bar,
)