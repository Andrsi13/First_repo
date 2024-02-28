def factorial(n):
    if n <= 1:
        return 1
    else:
        return n + factorial(n - 1)

#factorial(5)    # 120

print(factorial(5))