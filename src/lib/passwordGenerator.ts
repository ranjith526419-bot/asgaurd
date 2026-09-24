export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};

export function generatePassword(options: PasswordGeneratorOptions): string {
  let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowercase = 'abcdefghijklmnopqrstuvwxyz';
  let numbers = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.excludeAmbiguous) {
    uppercase = uppercase.replace(/[O0I1l]/g, '');
    lowercase = lowercase.replace(/[O0I1l]/g, '');
    numbers = numbers.replace(/[01]/g, '');
    symbols = symbols.replace(/[|;:,.<>]/g, '');
  }

  let charset = '';
  const guaranteedChars: string[] = [];

  const getRandomChar = (str: string) => {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    return str[randomArray[0] % str.length];
  };

  if (options.includeUppercase && uppercase.length > 0) {
    charset += uppercase;
    guaranteedChars.push(getRandomChar(uppercase));
  }
  if (options.includeLowercase && lowercase.length > 0) {
    charset += lowercase;
    guaranteedChars.push(getRandomChar(lowercase));
  }
  if (options.includeNumbers && numbers.length > 0) {
    charset += numbers;
    guaranteedChars.push(getRandomChar(numbers));
  }
  if (options.includeSymbols && symbols.length > 0) {
    charset += symbols;
    guaranteedChars.push(getRandomChar(symbols));
  }

  if (charset.length === 0) {
    charset = lowercase;
  }

  const result: string[] = [...guaranteedChars];
  const targetLength = Math.max(options.length, guaranteedChars.length);

  for (let i = guaranteedChars.length; i < targetLength; i++) {
    result.push(getRandomChar(charset));
  }

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, options.length).join('');
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'bg-neutral-600' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 0.5;
  if (/[^A-Za-z0-9]/.test(password)) score += 0.5;

  const rounded = Math.min(4, Math.floor(score));

  switch (rounded) {
    case 0:
    case 1:
      return { score: 1, label: 'Weak', color: 'bg-red-500' };
    case 2:
      return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    case 3:
      return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    case 4:
    default:
      return { score: 4, label: 'Very Strong', color: 'bg-indigo-500' };
  }
}
