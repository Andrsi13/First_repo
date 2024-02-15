def is_valid_pin_codes(pin_codes):
    
    if not all(isinstance(pin, str) for pin in pin_codes):
        return False
    
    if not all(len(pin) == 4 and pin.isdigit() for pin in pin_codes):
        return False
    
    if len(pin_codes) != len(set(pin_codes)):
        return False
    if pin_codes == []:
        return False

    else:
        return True
print(is_valid_pin_codes(['1101', '9034', '0011']))


