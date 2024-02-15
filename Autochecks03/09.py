def factorial(n):
    if n < 2:
        return 1
    else:
        return n * factorial(n - 1)    
        
    
        


def number_of_groups(n, k):
    a = factorial(n)/(factorial(n-k)*factorial(k))
    return int(a)

a = number_of_groups(50,7)
print(a)