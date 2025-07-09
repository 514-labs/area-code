from typing import List
from datetime import datetime, timedelta
import random
import string
import uuid
from app.ingest.models import Foo, FooStatus

def random_string(length: int) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def random_enum(enum_class: type[FooStatus]) -> FooStatus:
    return random.choice(list(enum_class))

def random_date() -> datetime:
    seconds_ago = random.randint(0, 1000000000)
    return datetime.now() - timedelta(seconds=seconds_ago)

def random_foo() -> Foo:
    return Foo(
        id=str(uuid.uuid4()),
        name=random_string(8),
        description=random_string(20) if random.random() > 0.5 else None,
        status=random_enum(FooStatus),
        priority=random.randint(0, 9),
        is_active=random.random() > 0.5,
        tags=[random_string(4) for _ in range(random.randint(1, 5))],
        score=round(random.random() * 100, 2),
        large_text=random_string(100),
        created_at=random_date(),
        updated_at=random_date()
    )