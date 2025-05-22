import { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login - Ainee",
  description: "Login to your Ainee account",
};

export default function LoginPage() {
  return <LoginForm />;
} 