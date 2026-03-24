from jurisflow_shared import get_redis_settings
from jurisflow_worker.jobs import generate_draft, process_document, run_research


class WorkerSettings:
    functions = [process_document, run_research, generate_draft]
    redis_settings = get_redis_settings()
    queue_name = "arq:queue"
    max_jobs = 10
    health_check_interval = 30
