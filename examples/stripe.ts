import { z } from "zod";
import Stripe from "stripe";
import { createResource, createMCPServer } from "../src/index.js";

// --- Stripe Client Initialization ---
if (!process.env.STRIPE_API_KEY) {
	throw new Error("STRIPE_API_KEY environment variable not set.");
}
const stripe = new Stripe(process.env.STRIPE_API_KEY, {
	apiVersion: "2024-06-20",
	typescript: true,
});

// --- Zod Schemas for Stripe Objects ---
const CustomerSchema = z
	.object({
		id: z.string(),
		object: z.literal("customer"),
		name: z.string().nullish(),
		email: z.string().nullish(),
		phone: z.string().nullish(),
		description: z.string().nullish(),
		created: z.number(),
	})
	.describe("Stripe Customer object.");

// --- mcpresso Resource Definitions ---
const customerResource = createResource({
	name: "customer",
	schema: CustomerSchema,
	uri_template: "customers/{id}",
	methods: {
		get: {
			handler: async ({ id }) => {
				const customer = await stripe.customers.retrieve(id);

				if (!customer || customer.deleted) {
					throw new Error("Customer not found");
				}

				return customer;
			},
		},

		create: {
			handler: async ({ name, email, phone, description }) => {
				const customer = await stripe.customers.create({
					name: name ?? undefined,
					email: email ?? undefined,
					phone: phone ?? undefined,
					description: description ?? undefined,
				});
				return customer;
			},
		},

		update: {
			handler: async ({ id, ...data }) => {
				const customer = await stripe.customers.update(id, {
					name: data.name ?? undefined,
					email: data.email ?? undefined,
					phone: data.phone ?? undefined,
					description: data.description ?? undefined,
				});
				return customer;
			},
		},

		delete: {
			handler: async ({ id }) => {
				const customer = await stripe.customers.del(id);
				return { success: true };
			},
		},

		list: {
			handler: async () => {
				const customers = await stripe.customers.list();
				return customers.data;
			},
		},
	},
});

// --- MCPresso Server Creation ---

const server = createMCPServer({
	name: "stripe_server",
	resources: [customerResource],
	exposeTypes: true,
});

server.listen(3081, () => {
	console.log("MCPresso Stripe server running on http://localhost:3081");
});
