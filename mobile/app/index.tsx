import { Redirect } from 'expo-router';
import { useApp } from '../src/store';

// First open: Aoun calls to arrange the screening. After booking: the app home.
export default function Index() {
  const confirmed = useApp((s) => s.plan.confirmed);
  return <Redirect href={confirmed ? '/home' : '/incoming'} />;
}
