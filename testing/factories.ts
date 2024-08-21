import type { User } from "@/types/auth-types";
import { Factory } from "interface-forge";

export const UserFactory = new Factory<User>((factory) => ({
	app_metadata: {},
	user_metadata: {},

	aud: factory.string.uuid(),
	avatar_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	created_at: factory.date.past().toISOString(),
	email: factory.internet.email(),
	first_name: factory.person.firstName(),
	id: factory.string.uuid(),
	last_name: factory.person.lastName(),
	updated_at: factory.date.recent().toISOString(),
	username: factory.internet.userName(),
}));
