import { Redirect } from 'expo-router';
import { useApp } from '../src/store';

// First open: the Sehhaty welcome, then the app home. The call with Rufaida opens only when the person
// asks for it (home, visit plan or «أنا معك»); a real call from the Ministry rings as a normal phone call.
export default function Index() {
  const welcomed = useApp((s) => s.welcomed);
  return <Redirect href={welcomed ? '/home' : '/welcome'} />;
}
