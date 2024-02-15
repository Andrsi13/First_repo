


def add_recursion(max_number):
    
    if max_number <=0:
        return 0
    if max_number == 1:
        return 1
    
    return max_number + add_recursion(max_number - 1)




def recur_factorial(n):
    if n == 1:
        return n
    else:
        return n * recur_factorial(n - 1 )
    
res = recur_factorial(5)
print(res)