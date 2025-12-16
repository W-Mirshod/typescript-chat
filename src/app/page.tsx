import { Chat } from "./components/Chat";

export default function Home() {
  const id = crypto.randomUUID();
  return <Chat id={id} />;
}
