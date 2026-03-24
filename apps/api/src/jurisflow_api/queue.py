from arq import create_pool

from jurisflow_shared import get_redis_settings


async def enqueue_job(function_name: str, *args) -> None:
    redis = await create_pool(get_redis_settings())
    try:
        await redis.enqueue_job(function_name, *args)
    finally:
        await redis.close()
