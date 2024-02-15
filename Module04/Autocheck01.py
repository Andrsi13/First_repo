
payment = [1, -3, 4]
def amount_payment(payment):
    result = 0
    for item in payment:
        if item <= 0:
            pass
        else:
            result = result + item
    return result

print(amount_payment(payment))
    
    
    
        
            
    