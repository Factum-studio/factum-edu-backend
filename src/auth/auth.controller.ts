import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express';
import RequestWithUser from 'src/types/request-with-user.type';
import { UserFromClient } from 'src/user/interfaces/user-from-client.interface';
import { User } from 'src/user/interfaces/user.interface';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MailService } from 'src/mail/mail.service';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
	constructor(
		private AuthService: AuthService,
		private mailService: MailService
	) { }

	@Throttle({
    default: {
      ttl: 60000,
      limit: 4,
      blockDuration: 5 * 60000
    }
  })
	@HttpCode(HttpStatus.CREATED)
	@Post('registration')
	async registration(
		@Res({ passthrough: true }) res: Response,
		@Body() user: User
	) {
		const userData = await this.AuthService.registration(user)
		await this.mailService.sendUserConfirmation(user);

		let refreshToken = userData.refreshToken
		delete userData.refreshToken

		res.cookie(
			'refreshToken',
			refreshToken,
			{
				maxAge: 30 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		).cookie(
			'token',
			userData.accessToken,
			{
				maxAge: 7 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		)
		.json(userData)
	}

	@Throttle({
    default: {
      ttl: 60000,
      limit: 4,
      blockDuration: 5 * 60000
    }
  })
	@HttpCode(HttpStatus.CREATED)
	@Post('register-student')
	async registerStudent(
		@Res({ passthrough: true }) res: Response,
		@Body() user: User
	) {
		const userData = await this.AuthService.registration(user)
		// await this.mailService.sendUserConfirmation(user);

		let refreshToken = userData.refreshToken
		delete userData.refreshToken

		// dont send cookies
		res.json(userData)
		// .cookie(
		// 	'refreshToken',
		// 	refreshToken,
		// 	{
		// 		maxAge: 30 * 24 * 60 * 60 * 1000,
		// 		httpOnly: !eval(process.env.HTTPS),
		// 		secure: eval(process.env.HTTPS),
		// 		domain: process.env?.DOMAIN ?? ''
		// 	}
		// ).cookie(
		// 	'token',
		// 	userData.accessToken,
		// 	{
		// 		maxAge: 7 * 24 * 60 * 60 * 1000,
		// 		httpOnly: !eval(process.env.HTTPS),
		// 		secure: eval(process.env.HTTPS),
		// 		domain: process.env?.DOMAIN ?? ''
		// 	}
		// )
		
	}
	
	@Throttle({
    default: {
      ttl: 60000,
      limit: 5,
      blockDuration: 5 * 60000
    }
  })
	@HttpCode(HttpStatus.OK)
	@Post('login')
	async login(
		@Res({ passthrough: true }) res: Response,
		@Body('email') email: string,
		@Body('password') password: string
	) {
		const userData = await this.AuthService.login(email, password)

		let refreshToken = userData.refreshToken
		delete userData.refreshToken

		res.cookie(
			'refreshToken',
			refreshToken,
			{
				maxAge: 30 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		).cookie(
			'token',
			userData.accessToken,
			{
				maxAge: 7 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		)
		.json(userData)
	}

	@HttpCode(HttpStatus.OK)
	@Get('refresh')
	async refresh(
		@Req() req: Request,
		@Res() res: Response,
	) {
		const { refreshToken, token } = req.cookies
		
		// проверить, валиден ещё accessToken
		// если accessToken не валиден - сделать новый с помощью refreshToken
		const userData = await this.AuthService.refresh(refreshToken, token)

		res.cookie(
			'refreshToken',
			refreshToken,
			{
				maxAge: 30 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		)		
		res.cookie(
			'token',
			userData.accessToken,
			{
				maxAge: 7 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		)
		res.json(userData.user)
	}

	@HttpCode(HttpStatus.OK)
	@Post('logout')
	async logout(
		@Req() req: Request,
		@Res() res: Response,
	) {
		const { refreshToken } = req.cookies

		await this.AuthService.logout(refreshToken)
		res.clearCookie('refreshToken').clearCookie('token').send()
	}

	@Throttle({
    default: {
      ttl: 60000,
      limit: 4,
      blockDuration: 5 * 60000
    }
  })
	@Post('reset-password')
	async resetPassword(
		@Res() res: Response,
		@Body('password') password: string,
		@Body('token') token: string,
		@Body('userId') userId: string
	) {
		const userData = await this.AuthService.resetPassword(password, token, userId)

		let refreshToken = userData.refreshToken
		delete userData.refreshToken

		res.cookie(
			'refreshToken',
			refreshToken,
			{
				maxAge: 30 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		).cookie(
			'token',
			userData.accessToken,
			{
				maxAge: 7 * 24 * 60 * 60 * 1000,
				httpOnly: !eval(process.env.HTTPS),
				secure: eval(process.env.HTTPS),
				domain: process.env?.DOMAIN ?? ''
			}
		).json(userData)
	}

	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	@Post('update')
	async update(
		@Req() req: RequestWithUser,
		@Body('user') new_user: UserFromClient
	) {
		return await this.AuthService.update(new_user, req.user)
	}

	@HttpCode(HttpStatus.OK)
	@Post('send-reset-link')
	async sendResetLink(
		@Body('email') email: string
	) {
		let link = await this.AuthService.sendResetLink(email)
		return link
	}

	@HttpCode(HttpStatus.OK)
	@Get('get-all-users')
	async getAllUsers(
	) {
		return await this.AuthService.getAllUsers()
	}
}
