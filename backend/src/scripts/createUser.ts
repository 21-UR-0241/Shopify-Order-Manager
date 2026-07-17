import bcrypt from 'bcryptjs';
import prisma from '../config/database';

async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'ADMIN' | 'USER' = 'USER'
): Promise<void> {
  try {
    await prisma.$connect();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isActive: true,
      },
    });

    console.log(`✅ User created successfully:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: ${role}`);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log('\n📝 Usage: npm run create-user <email> <password> <firstName> <lastName> [role]');
  console.log('\n📌 Examples:');
  console.log('   npm run create-user john@example.com password123 John Doe USER');
  console.log('   npm run create-user admin@shop.com pass456 Admin User ADMIN\n');
  process.exit(1);
}

const [email, password, firstName, lastName, role = 'USER'] = args;

if (role !== 'ADMIN' && role !== 'USER') {
  console.log('❌ Role must be either ADMIN or USER');
  process.exit(1);
}

createUser(email, password, firstName, lastName, role as 'ADMIN' | 'USER')
  .then(() => process.exit(0))
  .catch(() => process.exit(1));