// This is a simple schema definition for the User model
// It's not enforced by MongoDB directly but serves as documentation

const UserSchema = {
  name: String,
  email: String,
  password: String, // Hashed password
  image: String, // Optional profile image URL
  createdAt: Date,
  updatedAt: Date,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Additional fields can be added as needed
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }
};

export default UserSchema; 