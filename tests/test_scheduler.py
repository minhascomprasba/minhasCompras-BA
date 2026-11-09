import unittest
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from src.api import scheduler, settings


class RetentionSchedulerTests(unittest.TestCase):
    def tearDown(self):
        scheduler.shutdown_scheduler()

    def test_daily_job_runs_at_3am_salvador_by_default(self):
        built = scheduler.build_scheduler()
        job = built.get_job(scheduler.RETENTION_JOB_ID)
        tz = ZoneInfo('America/Bahia')
        fire = job.trigger.get_next_fire_time(None, datetime(2026, 11, 10, 3, 0, 1, tzinfo=tz))
        self.assertEqual(datetime(2026, 11, 11, 3, 0, tzinfo=tz), fire)
        self.assertEqual((1, True), (job.max_instances, job.coalesce))

    def test_cron_expression_and_timezone_are_configurable(self):
        # Dia da semana por nome: no APScheduler 3 o numero 0 e segunda (difere do cron padrao).
        with patch.multiple(settings, RETENTION_JOB_CRON='30 1 * * mon', RETENTION_JOB_TIMEZONE='UTC'):
            job = scheduler.build_scheduler().get_job(scheduler.RETENTION_JOB_ID)
        fire = job.trigger.get_next_fire_time(None, datetime(2026, 11, 10, tzinfo=ZoneInfo('UTC')))  # terça
        self.assertEqual(datetime(2026, 11, 16, 1, 30, tzinfo=ZoneInfo('UTC')), fire)                 # segunda

    def test_start_respects_flag_and_is_idempotent(self):
        with patch.object(settings, 'RETENTION_JOB_ENABLED', False):
            scheduler.start_scheduler()
            self.assertIsNone(scheduler._scheduler)
        scheduler.start_scheduler()
        first = scheduler._scheduler
        scheduler.start_scheduler()
        self.assertIs(first, scheduler._scheduler)
        self.assertTrue(first.running)
        scheduler.shutdown_scheduler()
        self.assertIsNone(scheduler._scheduler)

    def test_job_calls_retention_and_swallows_failures(self):
        with patch.object(scheduler, 'run_retention_jobs', return_value={'purged': 2, 'skipped': 0}) as run:
            scheduler._run_retention_job()
        run.assert_called_once_with()
        with patch.object(scheduler, 'run_retention_jobs', side_effect=RuntimeError('db down')), \
                self.assertLogs('src.api.scheduler', 'ERROR'):
            scheduler._run_retention_job()


if __name__ == '__main__':
    unittest.main()
