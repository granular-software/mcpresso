import { handle } from 'hono/aws-lambda'
import { app } from '../server.js'

export const handler = handle(app) 