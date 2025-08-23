#!/usr/bin/env python3
"""
Test runner for the Contract Intelligence Parser backend.
Runs all tests and generates coverage reports.
"""

import subprocess
import sys
import os

def run_tests():
    """Run all tests with coverage."""
    print("Running Contract Intelligence Parser tests...")
    
    # Run tests with coverage
    result = subprocess.run([
        "python", "-m", "pytest", 
        "tests/", 
        "--cov=app", 
        "--cov-report=term-missing", 
        "--cov-report=html:htmlcov",
        "--cov-fail-under=60",
        "-v"
    ], capture_output=True, text=True)
    
    print(result.stdout)
    
    if result.stderr:
        print("Errors:", result.stderr)
    
    return result.returncode == 0

def main():
    """Main test runner function."""
    success = run_tests()
    
    if success:
        print("\n✅ All tests passed!")
        print("📊 Coverage report generated in htmlcov/")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
