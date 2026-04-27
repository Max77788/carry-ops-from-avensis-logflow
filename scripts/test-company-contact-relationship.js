import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompanyContactRelationship() {
  console.log("Testing Company <-> Contact_Info relationship...\n");
  console.log("Schema: Contact_Info has Company_id (FK to companies.id)");
  console.log(
    "        companies has contact_info_id_fk (FK to Contact_Info.id)\n"
  );

  try {
    // Step 1: Create a company first
    console.log("1. Creating company...");
    const companyName = "Test Company " + Date.now();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
      })
      .select()
      .single();

    if (companyError) {
      console.error("   ✗ Error:", companyError.message);
      return;
    }

    console.log("   ✓ Created company:", company.name);
    console.log("     Company ID:", company.id);

    // Step 2: Create Contact_Info with Company_id (required field)
    console.log("\n2. Creating Contact_Info with Company_id...");
    const { data: contactInfo, error: contactError } = await supabase
      .from("Contact_Info")
      .insert({
        Company_id: company.id,
        Contact_Name: "John Doe",
        Contact_Email: "john.doe@example.com",
        Contact_Phone: "555-1234",
        Role: "Manager",
        Location: "Main Office",
        Notes: "Primary contact",
      })
      .select()
      .single();

    if (contactError) {
      console.error("   ✗ Error:", contactError.message);
      console.log("   Cleaning up company...");
      await supabase.from("companies").delete().eq("id", company.id);
      return;
    }

    console.log("   ✓ Created Contact_Info with ID:", contactInfo.id);
    console.log("     Contact Name:", contactInfo.Contact_Name);
    console.log("     Contact Email:", contactInfo.Contact_Email);

    // Step 3: Update company with contact_info_id_fk
    console.log("\n3. Updating company with contact_info_id_fk...");
    const { data: updatedCompany, error: updateError } = await supabase
      .from("companies")
      .update({ contact_info_id_fk: contactInfo.id })
      .eq("id", company.id)
      .select()
      .single();

    if (updateError) {
      console.error("   ✗ Error:", updateError.message);
    } else {
      console.log(
        "   ✓ Updated company with contact_info_id_fk:",
        updatedCompany.contact_info_id_fk
      );
    }

    // Step 4: Query company with Contact_Info joined
    console.log("\n4. Querying company with Contact_Info joined...");
    const { data: companyWithContact, error: queryError } = await supabase
      .from("companies")
      .select("*, Contact_Info(*)")
      .eq("id", company.id)
      .single();

    if (queryError) {
      console.error("   ✗ Error:", queryError.message);
    } else {
      console.log("   ✓ Company with Contact_Info:");
      console.log(JSON.stringify(companyWithContact, null, 2));
    }

    // Step 5: Query all contacts for this company
    console.log("\n5. Querying all Contact_Info for this company...");
    const { data: allContacts, error: contactsError } = await supabase
      .from("Contact_Info")
      .select("*")
      .eq("Company_id", company.id);

    if (contactsError) {
      console.error("   ✗ Error:", contactsError.message);
    } else {
      console.log(
        `   ✓ Found ${allContacts.length} contact(s) for this company`
      );
    }

    // Step 6: Clean up
    console.log("\n6. Cleaning up test data...");
    await supabase.from("Contact_Info").delete().eq("id", contactInfo.id);
    await supabase.from("companies").delete().eq("id", company.id);
    console.log("   ✓ Cleaned up");

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

testCompanyContactRelationship();
