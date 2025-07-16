from app.ingest.models import fooModel, barModel, Foo, Bar
from moose_lib import TransformConfig
from datetime import datetime

def foo_to_bar(foo: Foo):
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
