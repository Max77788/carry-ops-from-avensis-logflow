const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createVendorDocumentsBucket() {
  try {
    console.log('Creating vendor-documents storage bucket...');

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'vendor-documents');

    if (bucketExists) {
      console.log('✅ Bucket "vendor-documents" already exists');
      return;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('vendor-documents', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    });

    if (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }

    console.log('✅ Successfully created "vendor-documents" bucket');
    console.log('Bucket details:', data);

    // Set up RLS policy for the bucket (allow public read, authenticated write)
    console.log('\n⚠️  Note: You may need to set up Storage policies in Supabase Dashboard:');
    console.log('   1. Go to Storage > Policies');
    console.log('   2. Create policy for SELECT (public read)');
    console.log('   3. Create policy for INSERT (authenticated users)');
    console.log('   4. Create policy for UPDATE (authenticated users)');
    console.log('   5. Create policy for DELETE (authenticated users)');

  } catch (error) {
    console.error('Failed to create bucket:', error);
    process.exit(1);
  }
}

createVendorDocumentsBucket()
  .then(() => {
    console.log('\n✅ Bucket setup complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

