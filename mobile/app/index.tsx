import { Redirect } from 'expo-router';
import { useApp } from '../src/store';

// First open: the Sehhaty welcome, then Aoun calls to arrange the screening. After booking: the app home.
export default function Index() {
  const confirmed = useApp((s) => s.plan?.confirmed);
  const welcomed = useApp((s) => s.welcomed);
  return <Redirect href={!welcomed ? '/welcome' : confirmed ? '/home' : '/incoming'} />;
}
