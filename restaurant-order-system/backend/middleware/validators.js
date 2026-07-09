const { body } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    })
  ],
  login: [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ]
};

const orderValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').matches(/^[0-9]{10}$/).withMessage('Valid phone required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('pincode').matches(/^[0-9]{6}$/).withMessage('Valid pincode required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('payment').optional().isIn(['COD', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'])
  ]
};

module.exports = { authValidators, orderValidators };
