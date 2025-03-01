import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config(); // Ensure dotenv is loaded
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';
import { RolesModule } from './roles/roles.module';
import { S3Module } from './s3/s3.module';
import { AppStateModule } from './app-state/app-state.module';
import { MailModule } from './mail/mail.module';
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { CourseModule } from './course/course.module';
import { LessonModule } from './lesson/lesson.module';
import { VideoModule } from './video/video.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SolutionModule } from './solution/solution.module';

@Module({
  imports: [
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'public'),
        serveRoot: '/static/', // This is the route you will use to access your files 
      }
    ),
    ThrottlerModule.forRoot([{
      ttl: 1000,
      limit: 20,
      blockDuration: 10 * 60000
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URL, {
      connectionFactory: (connection) => {
        connection.plugin(require('mongoose-autopopulate'))
        return connection
      }
    }),
    AuthModule,
    TokenModule,
    UserModule,
    RolesModule,
    S3Module,
    AppStateModule,
    MailModule,
    CourseModule,
    LessonModule,
    VideoModule,
    SolutionModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }],
})
export class AppModule { }
