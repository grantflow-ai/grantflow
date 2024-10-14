import { createClient } from "@supabase/supabase-js";
import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { config } from "dotenv";
import type { Database } from "gen/database-types";
import nihActivityCodes from "./nih-activity-codes.json";

interface CFPRecord {
	category: string;
	code: string;
	title: string;
	description: string;
	url?: string;
}

async function seedDatabase() {
	config();
	const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_URL);
	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const supabase = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const { data: fundingOrganization, error: fundingOrganizationInsertError } = await supabase
		.from("funding_organizations")
		.insert({
			name: "NIH",
		})
		.select("*")
		.single();

	if (fundingOrganizationInsertError) {
		throw new Error(`Failed to insert funding organization: ${fundingOrganizationInsertError.message}`);
	}

	console.log("Funding organization inserted");

	const { data: insertedRecords, error: cfpInsertError } = await supabase
		.from("grant_cfps")
		.insert(
			(nihActivityCodes as CFPRecord[]).map(({ url, ...cfp }) => ({
				...cfp,
				url: url ?? null,
				funding_organization_id: fundingOrganization.id,
			})),
		)
		.select("id");

	if (cfpInsertError) {
		throw new Error(`Failed to retrieve CFP: ${cfpInsertError.message}`);
	}

	console.log(`Inserted ${insertedRecords.length} records`);
}

void seedDatabase();
