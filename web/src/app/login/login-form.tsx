"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signInWithApple } from "@/lib/firebase";
import { toast } from "sonner";
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const { updateUserInfo } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (firebaseUser: any) => {
    // If no user or it's an error object, don't proceed
    if (!firebaseUser || !firebaseUser.uid) {
      if (firebaseUser && firebaseUser.cancelled) {
        // Don't show error for user cancellation
        return;
      }
      return;
    }

    try {
      // Get Firebase token
      const token = await firebaseUser.getIdToken();
      
      // Call backend login API
      const response = await ApiLibs.user.loginApiUserLoginPost({
        id_token: token
      });

      if (response.code === ResponseCode.SUCCESS && response.data) {
        // Store the JWT token
        localStorage.setItem('ainee_token', response.data.jwt_token);
        
        // Fetch user info
        const userInfoResponse = await ApiLibs.user.getUserApiUserGetGet();
        if (userInfoResponse.code === ResponseCode.SUCCESS && userInfoResponse.data) {
          updateUserInfo(userInfoResponse.data);
          toast.success("Successfully signed in!");
          router.push("/dashboard");
        } else {
          toast.error("Failed to get user info");
        }
      } else {
        toast.error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to complete login");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const firebaseUser = await signInWithGoogle();
      await handleLogin(firebaseUser);
    } catch (error: any) {
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, don't show error
        console.log("Sign-in popup was closed by the user");
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup was blocked. Please allow popups for this site.");
      } else {
        console.error("Google sign in error:", error);
        toast.error("Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const firebaseUser = await signInWithApple();
      await handleLogin(firebaseUser);
    } catch (error) {
      console.error("Apple sign in error:", error);
      toast.error("Failed to sign in with Apple");
    }
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid px-4 py-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Ainee
          </h1>
        </div>
        <div className="grid gap-4 px-1">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`inline-flex w-full items-center justify-center rounded-md bg-[#69DA00] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5BC500] focus:outline-none focus:ring-2 focus:ring-[#69DA00] focus:ring-offset-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
            ) : (
              <Image
                src="/images/logo-google.png"
                alt="Google"
                width={20}
                height={20}
                className="mr-2"
              />
            )}
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>
          <button
            onClick={handleAppleSignIn}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#69DA00] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5BC500] focus:outline-none focus:ring-2 focus:ring-[#69DA00] focus:ring-offset-2"
          >
            <Image
              src="/images/logo-apple.png"
              alt="Apple"
              width={20}
              height={20}
              className="mr-2"
            />
            Continue with Apple
          </button>
         
        </div>
        <p className="px-4 text-center text-sm text-muted-foreground">
          By clicking continue, you accept our{" "}
          <a
            href="https://blog.ainee.com/index.php/2025/03/28/terms-and-conditions/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a
            href="https://blog.ainee.com/index.php/2025/03/28/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
} 