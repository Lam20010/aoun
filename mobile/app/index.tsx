import { Redirect } from 'expo-router';
import { useApp } from '../src/store';

// First open: the Sehhaty welcome, then Aoun calls to arrange the screening (unless the person turned
// Rufaida's calls off). After booking: the app home.
export default function Index() {
  const confirmed = useApp((s) => s.plan?.confirmed);
  const welcomed = useApp((s) => s.welcomed);
  const callsOff = useApp((s) => s.me?.calls_ok === false);
  return <Redirect href={!welcomed ? '/welcome' : confirmed || callsOff ? '/home' : '/incoming'} />;
}
