import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { NoteModule } from './note/note.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { TestGeneratorModule } from './test-generator/test-generator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    NoteModule,
    WaitlistModule,
    TestGeneratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
