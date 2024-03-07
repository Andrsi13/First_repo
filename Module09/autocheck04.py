def discount_price(discount):
    def calculate_discount_price(price):
        return price * (1 - discount)

    return calculate_discount_price
