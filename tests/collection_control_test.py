import subprocess,sys,time,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collection_control import ChainBudget,supervise
class ControlTests(unittest.TestCase):
 def test_circuit_stops_repeated_failures(self):
  b=ChainBudget(max_failures=3)
  for _ in range(3):b.record(False)
  self.assertFalse(b.allowed());self.assertIn('repeated failures',b.reason)
 def test_success_resets_failure_streak(self):
  b=ChainBudget(max_failures=2);b.record(False);b.record(True);b.record(False)
  self.assertTrue(b.allowed())
 def test_deadline_is_independent_of_successful_requests(self):
  clock=[0];b=ChainBudget(seconds=10,clock=lambda:clock[0]);clock[0]=11;b.record(True)
  self.assertFalse(b.allowed())
 def test_stuck_process_is_terminated_and_returns_terminal_state(self):
  p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']);start=time.monotonic()
  result=supervise(p,.15,lambda:None,poll=.05)
  self.assertEqual(result,'time_budget');self.assertIsNotNone(p.returncode);self.assertLess(time.monotonic()-start,5)
 def test_success_and_failure_are_not_conflated(self):
  for code,expected in [(0,'finished'),(7,'failed')]:
   p=subprocess.Popen([sys.executable,'-c',f'raise SystemExit({code})'])
   self.assertEqual(supervise(p,5,lambda:None,poll=.05),expected)
if __name__=='__main__':unittest.main()
