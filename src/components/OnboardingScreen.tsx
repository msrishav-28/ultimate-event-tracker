import { useState } from 'react';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { useApp } from '../context/AppContext';

export function OnboardingScreen() {
  const { login, register, isLoading, error, clearError } = useApp();
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginData.email || !loginData.password) {
      return;
    }

    try {
      await login(loginData.email, loginData.password);
    } catch (err) {
      // Error is handled in context
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!registerData.name || !registerData.email || !registerData.password) {
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      return;
    }

    if (registerData.password.length < 6) {
      return;
    }

    try {
      await register({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password
      });
    } catch (err) {
      // Error is handled in context
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#1976D2' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="12" width="24" height="20" rx="2" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M8 16h24M14 12v-4M26 12v-4" stroke="white" strokeWidth="2"/>
              <circle cx="14" cy="22" r="1.5" fill="white"/>
              <circle cx="20" cy="22" r="1.5" fill="white"/>
              <circle cx="26" cy="22" r="1.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-[28px]" style={{ color: '#212121' }}>College Event Tracker</h1>
        </div>

        {/* Feature highlights */}
        <div className="space-y-2 text-left">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43A047' }} />
            <p className="text-[12px]" style={{ color: '#424242' }}>
              Upload event posters - we extract details automatically
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43A047' }} />
            <p className="text-[12px]" style={{ color: '#424242' }}>
              Get smart reminders tailored to your schedule
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#43A047' }} />
            <p className="text-[12px]" style={{ color: '#424242' }}>
              Never miss events with friends
            </p>
          </div>
        </div>

        {/* Auth Forms */}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your.email@college.edu"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                style={{ backgroundColor: '#1976D2' }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="John Doe"
                  value={registerData.name}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your.email@college.edu"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm">Confirm Password</Label>
                <Input
                  id="register-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                style={{ backgroundColor: '#1976D2' }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Privacy notice */}
        <p className="text-[12px] text-center" style={{ color: '#757575' }}>
          By continuing, you agree to our{' '}
          <a href="#" className="underline" style={{ color: '#1976D2' }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
