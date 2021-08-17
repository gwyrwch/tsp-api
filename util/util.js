const are_method_params_valid = (valid_params, body) => {
    for (param in valid_params) {
        if (!(param in body)) {
            return false;
        }
    }

    return true;
};

module.exports = are_method_params_valid;
