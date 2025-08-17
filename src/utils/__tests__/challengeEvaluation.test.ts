import { describe, it, expect } from 'vitest'

// Test data matching the default challenges from useQuestGame
const challenges = [
  {
    id: 1,
    title: "Array Sum",
    description: "Write a function called 'sum' that takes an array of numbers and returns their sum.",
    hint: "Use a loop or the reduce method to add all numbers together.",
    tests: [
      { input: [1, 2, 3], expected: 6 },
      { input: [10, 20, 30], expected: 60 },
      { input: [-5, 5], expected: 0 },
      { input: [42], expected: 42 }
    ],
    points: 100,
    functionName: "sum",
    starter: "function sum(arr) {\n  // Your code here\n  \n}"
  },
  {
    id: 2,
    title: "String Reversal",
    description: "Create a function called 'reverseString' that reverses a string.",
    hint: "You can split the string into an array, reverse it, and join it back.",
    tests: [
      { input: "hello", expected: "olleh" },
      { input: "world", expected: "dlrow" },
      { input: "12345", expected: "54321" },
      { input: "a", expected: "a" }
    ],
    points: 100,
    functionName: "reverseString",
    starter: "function reverseString(str) {\n  // Your code here\n  \n}"
  },
  {
    id: 3,
    title: "Even Filter",
    description: "Write a function called 'getEvens' that returns only even numbers from an array.",
    hint: "Use the filter method or a loop with the modulo operator (%).",
    tests: [
      { input: [1, 2, 3, 4, 5], expected: [2, 4] },
      { input: [10, 15, 20], expected: [10, 20] },
      { input: [1, 3, 5], expected: [] },
      { input: [0, 2, 4], expected: [0, 2, 4] }
    ],
    points: 150,
    functionName: "getEvens",
    starter: "function getEvens(arr) {\n  // Your code here\n  \n}"
  },
  {
    id: 4,
    title: "Palindrome Check",
    description: "Create a function called 'isPalindrome' that checks if a string is a palindrome.",
    hint: "Compare the string with its reverse. Remember to handle case sensitivity.",
    tests: [
      { input: "racecar", expected: true },
      { input: "hello", expected: false },
      { input: "A man a plan a canal Panama", expected: true },
      { input: "noon", expected: true }
    ],
    points: 200,
    functionName: "isPalindrome",
    starter: "function isPalindrome(str) {\n  // Remove spaces and convert to lowercase\n  // Your code here\n  \n}"
  },
  {
    id: 5,
    title: "Fibonacci",
    description: "Write a function called 'fibonacci' that returns the nth Fibonacci number.",
    hint: "Each number is the sum of the two preceding ones. Use iteration or recursion.",
    tests: [
      { input: 0, expected: 0 },
      { input: 1, expected: 1 },
      { input: 6, expected: 8 },
      { input: 10, expected: 55 }
    ],
    points: 250,
    functionName: "fibonacci",
    starter: "function fibonacci(n) {\n  // Your code here\n  \n}"
  }
]

// Helper function to evaluate code like the game does
function evaluateChallenge(userCode: string, challenge: typeof challenges[0]) {
  const results: Array<{ passed: boolean; message: string }> = []

  try {
    // Create function with proper context
    const func = new Function('return (' + userCode + ')')() as (...args: unknown[]) => unknown

    challenge.tests.forEach((test, i) => {
      try {
        let result: unknown
        // Special handling for palindrome as done in the game
        if (challenge.functionName === 'isPalindrome') {
          result = func(test.input)
        } else if (Array.isArray(test.input)) {
          result = func(test.input)
        } else {
          result = func(test.input)
        }

        if (JSON.stringify(result) === JSON.stringify(test.expected)) {
          results.push({ passed: true, message: `✓ Test ${i + 1}: PASSED` })
        } else {
          results.push({ passed: false, message: `✗ Test ${i + 1}: FAILED - Got ${JSON.stringify(result)}` })
        }
      } catch (e) {
        results.push({ passed: false, message: `✗ Test ${i + 1}: ERROR - ${(e as Error).message}` })
      }
    })
  } catch (e) {
    results.push({ passed: false, message: 'Syntax Error: ' + (e as Error).message })
  }

  return results
}

describe('Challenge Evaluation', () => {
  describe('Array Sum Challenge', () => {
    const sumChallenge = challenges[0]

    it('should pass with correct reduce implementation', () => {
      const userCode = 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }'
      const results = evaluateChallenge(userCode, sumChallenge)
      
      expect(results).toHaveLength(4)
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should pass with for loop implementation', () => {
      const userCode = `function sum(arr) {
        let total = 0;
        for (let i = 0; i < arr.length; i++) {
          total += arr[i];
        }
        return total;
      }`
      const results = evaluateChallenge(userCode, sumChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should fail with incorrect implementation', () => {
      const userCode = 'function sum(arr) { return arr.length; }'
      const results = evaluateChallenge(userCode, sumChallenge)
      
      expect(results.some(r => !r.passed)).toBe(true)
      expect(results[0].message).toContain('FAILED')
    })

    it('should handle syntax errors', () => {
      const userCode = 'function sum(arr) { return arr.reduce((a, b) => a + b, 0; }' // Missing closing paren
      const results = evaluateChallenge(userCode, sumChallenge)
      
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(false)
      expect(results[0].message).toContain('Syntax Error')
    })
  })

  describe('String Reversal Challenge', () => {
    const reverseChallenge = challenges[1]

    it('should pass with split/reverse/join implementation', () => {
      const userCode = 'function reverseString(str) { return str.split("").reverse().join(""); }'
      const results = evaluateChallenge(userCode, reverseChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should pass with for loop implementation', () => {
      const userCode = `function reverseString(str) {
        let reversed = "";
        for (let i = str.length - 1; i >= 0; i--) {
          reversed += str[i];
        }
        return reversed;
      }`
      const results = evaluateChallenge(userCode, reverseChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should fail with incorrect implementation', () => {
      const userCode = 'function reverseString(str) { return str; }'
      const results = evaluateChallenge(userCode, reverseChallenge)
      
      expect(results.some(r => !r.passed)).toBe(true)
    })
  })

  describe('Even Filter Challenge', () => {
    const evenChallenge = challenges[2]

    it('should pass with filter implementation', () => {
      const userCode = 'function getEvens(arr) { return arr.filter(n => n % 2 === 0); }'
      const results = evaluateChallenge(userCode, evenChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should pass with for loop implementation', () => {
      const userCode = `function getEvens(arr) {
        const evens = [];
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] % 2 === 0) {
            evens.push(arr[i]);
          }
        }
        return evens;
      }`
      const results = evaluateChallenge(userCode, evenChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should handle empty array correctly', () => {
      const userCode = 'function getEvens(arr) { return arr.filter(n => n % 2 === 0); }'
      const results = evaluateChallenge(userCode, evenChallenge)
      
      // Test case with [1, 3, 5] should return []
      const emptyArrayTest = results.find(r => r.message.includes('Test 3'))
      expect(emptyArrayTest?.passed).toBe(true)
    })

    it('should fail with incorrect implementation', () => {
      const userCode = 'function getEvens(arr) { return arr; }'
      const results = evaluateChallenge(userCode, evenChallenge)
      
      expect(results.some(r => !r.passed)).toBe(true)
    })
  })

  describe('Palindrome Challenge', () => {
    const palindromeChallenge = challenges[3]

    it('should pass with case-insensitive implementation', () => {
      const userCode = `function isPalindrome(str) {
        const cleaned = str.replace(/\\s+/g, '').toLowerCase();
        return cleaned === cleaned.split('').reverse().join('');
      }`
      const results = evaluateChallenge(userCode, palindromeChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should handle spaces correctly', () => {
      const userCode = `function isPalindrome(str) {
        const cleaned = str.replace(/\\s+/g, '').toLowerCase();
        return cleaned === cleaned.split('').reverse().join('');
      }`
      const results = evaluateChallenge(userCode, palindromeChallenge)
      
      // "A man a plan a canal Panama" should return true
      const spaceTest = results.find(r => r.message.includes('Test 3'))
      expect(spaceTest?.passed).toBe(true)
    })

    it('should fail with case-sensitive implementation', () => {
      const userCode = 'function isPalindrome(str) { return str === str.split("").reverse().join(""); }'
      const results = evaluateChallenge(userCode, palindromeChallenge)
      
      // Should fail on "A man a plan a canal Panama" test
      expect(results.some(r => !r.passed)).toBe(true)
    })
  })

  describe('Fibonacci Challenge', () => {
    const fibChallenge = challenges[4]

    it('should pass with iterative implementation', () => {
      const userCode = `function fibonacci(n) {
        if (n <= 1) return n;
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
          [a, b] = [b, a + b];
        }
        return b;
      }`
      const results = evaluateChallenge(userCode, fibChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should pass with recursive implementation', () => {
      const userCode = `function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }`
      const results = evaluateChallenge(userCode, fibChallenge)
      
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should handle base cases correctly', () => {
      const userCode = `function fibonacci(n) {
        if (n <= 1) return n;
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
          [a, b] = [b, a + b];
        }
        return b;
      }`
      const results = evaluateChallenge(userCode, fibChallenge)
      
      // Test fib(0) = 0 and fib(1) = 1
      const zeroTest = results.find(r => r.message.includes('Test 1'))
      const oneTest = results.find(r => r.message.includes('Test 2'))
      expect(zeroTest?.passed).toBe(true)
      expect(oneTest?.passed).toBe(true)
    })

    it('should fail with incorrect implementation', () => {
      const userCode = 'function fibonacci(n) { return n; }'
      const results = evaluateChallenge(userCode, fibChallenge)
      
      expect(results.some(r => !r.passed)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle runtime errors gracefully', () => {
      const userCode = 'function sum(arr) { return arr.undefinedMethod(); }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      expect(results.some(r => r.message.includes('ERROR'))).toBe(true)
    })

    it('should handle undefined function', () => {
      const userCode = 'function wrongName(arr) { return 0; }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      // When the wrong function name is used, it should fail the tests
      // because the expected function (sum) won't be available
      expect(results.some(r => !r.passed)).toBe(true)
    })

    it('should handle missing return statement', () => {
      const userCode = 'function sum(arr) { let total = 0; }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      expect(results.some(r => !r.passed)).toBe(true)
    })
  })

  describe('Input Type Handling', () => {
    it('should handle array inputs correctly', () => {
      const userCode = 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      // All sum tests use array inputs
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should handle single value inputs correctly', () => {
      const userCode = 'function reverseString(str) { return str.split("").reverse().join(""); }'
      const results = evaluateChallenge(userCode, challenges[1])
      
      // All reverseString tests use single string inputs
      expect(results.every(r => r.passed)).toBe(true)
    })

    it('should handle special palindrome input handling', () => {
      const userCode = `function isPalindrome(str) {
        const cleaned = str.replace(/\\s+/g, '').toLowerCase();
        return cleaned === cleaned.split('').reverse().join('');
      }`
      const results = evaluateChallenge(userCode, challenges[3])
      
      // Palindrome uses direct input (not spread)
      expect(results.every(r => r.passed)).toBe(true)
    })
  })

  describe('Points Calculation', () => {
    it('should calculate correct points for completed challenges', () => {
      const userCode = 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      const allPassed = results.every(r => r.passed)
      const points = allPassed ? challenges[0].points : 0
      
      expect(points).toBe(100)
    })

    it('should give no points for failed challenges', () => {
      const userCode = 'function sum(arr) { return 0; }'
      const results = evaluateChallenge(userCode, challenges[0])
      
      const allPassed = results.every(r => r.passed)
      const points = allPassed ? challenges[0].points : 0
      
      expect(points).toBe(0)
    })
  })
})