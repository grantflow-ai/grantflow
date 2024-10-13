import { Factory } from "interface-forge";
import { User } from "@/types/database-types";

export const UserFactory = new Factory<User>((factory) => ({
	app_metadata: {},
	user_metadata: {},

	aud: factory.string.uuid(),
	avatar_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	created_at: factory.date.past().toISOString(),
	email: factory.internet.email(),
	name: factory.person.fullName(),
	id: factory.string.uuid(),
	updated_at: factory.date.recent().toISOString(),
}));
