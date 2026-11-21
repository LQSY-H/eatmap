import { permanentRedirect } from "next/navigation";

export default function LegacyIntroRedirect() {
  permanentRedirect("/welcome");
}
