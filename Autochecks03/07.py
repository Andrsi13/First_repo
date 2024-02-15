def cost_delivery(quantity , *items , discount = 0):
    if quantity <= 1:
        cost = 5
    else: 
        cost = 5 + (quantity - 1)*2

    final_cost = cost - cost*discount
    return final_cost


a = cost_delivery(3,3)
print(a)
