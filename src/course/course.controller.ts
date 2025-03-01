import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';

// all aboout MongoDB
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CourseClass } from './schemas/course.schema';
import { UserClass } from 'src/user/schemas/user.schema';
import { LessonClass } from './schemas/lesson.schema';

import YaCloud from 'src/s3/bucket';
const sharp = require('sharp');

import { AdminAuthGuard } from 'src/auth/admin.guard';
import { TeacherAuthGuard } from 'src/auth/teacher.guard';
import { AuthGuard } from 'src/auth/auth.guard';


@Controller('courses')
export class CourseController {
  constructor(
    @InjectModel('Course') private CourseModel: Model<CourseClass>,
    @InjectModel('User') private UserModel: Model<UserClass>,
    @InjectModel('Lesson') private LessonModel: Model<LessonClass>,
    private readonly courseService: CourseService
  ) { }

  @UseGuards(AuthGuard)
  @Post('student/get-all')
  async userGetAll(
    @Body('courses') courses: any
  ) {
    // когда админ - получает все курсы
    // когда обычный пользователь только свои курсы
    return await this.CourseModel.find({ _id: { $in: courses } })
  }

  @UseGuards(TeacherAuthGuard)
  @Post('teacher/get-all')
  async teacherGetAll(
    @Body('courses') courses: any
  ) {
    // когда админ - получает все курсы
    // когда обычный пользователь только свои курсы
    return await this.CourseModel.find({ _id: { $in: courses } })
  }

  @UseGuards(TeacherAuthGuard)
  @Post('teacher/update')
  async updateCourseTeacher(
    @Body('course') newCourse: any,
    @Body('courseId') courseId: string
  ) {
    return await this.CourseModel.findByIdAndUpdate(courseId, newCourse)
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/update')
  async updateCourseAdmin(
    @Body('course') newCourse: any,
    @Body('courseId') courseId: string
  ) {
    return await this.CourseModel.findByIdAndUpdate(courseId, newCourse)
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/get-all')
  async adminGetAll(
  ) {
    // когда админ - получает все курсы
    // когда обычный пользователь только свои курсы    
    return await this.CourseModel.find({})
  }

  @Get('one-with-lessons')
  async getCourseByIdWithLessons(
    @Query('course_id') courseId: string
  ) {
    try {
      return await this.CourseModel.findById(courseId).populate({ path: 'lessons', populate: { path: 'homework' } })
    } catch (error) {
      return error
    }
  }

  @Post('add-user-to-course')
  async addUserToCourse(
    @Body('courseId') courseId: string,
    @Body('userId') userId: string
  ) {
    let result = await this.CourseModel.findByIdAndUpdate(courseId, { $push: { students: userId } })
    if (result) {
      return await this.UserModel.findByIdAndUpdate(userId, { $push: { myCourses: courseId } })
    }
    return;
  }

  @Post('images')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Query('course_id') course_id: String,
  ) {
    let filenames = [];

    for (let file of files) {
      if (file.originalname.startsWith('logo')) {
        file.buffer = await sharp(file.buffer).resize(300, 300).toBuffer()
      }
      let uploadResult = await YaCloud.Upload({
        file,
        path: 'courses',
        fileName: file.originalname,
      });
      filenames.push(uploadResult.Location);
    }
    let setObj = {};
    if (filenames[0]) { setObj['images.logo'] = filenames[0] };

    return await this.CourseModel.findByIdAndUpdate(course_id, {
      $set: setObj,
    });
  }

  @Post('create-lesson')
  async createLesson(
    @Body('courseId') courseId: string,
    @Body('lesson') lesson: any
  ) {
    lesson.course = courseId;
    let lessonFromDb = await this.LessonModel.create(lesson)
    if (lessonFromDb._id) {
      return await this.CourseModel.findByIdAndUpdate(courseId, { $push: { lessons: lessonFromDb._id } })
    }
    return;
  }

  @Post('create')
  async createCourse(
    @Body('course') course: any
  ) {
    let courseFromDb = await this.CourseModel.create(course)
    await this.UserModel.findByIdAndUpdate(course.teacher, { $push: { createdCourses: courseFromDb._id } })

    return courseFromDb
  }

  @Get('get-lessons-by-course')
  async getLessonsByCourseId(
    @Query('course_id') courseId: string
  ) {
    return await this.CourseModel.findById(courseId, { lessons: 1 }).populate({
      path: 'lessons', populate: {
        path: 'homework',
        model: 'Homework',
      }
    })
  }

  @Post('student/get-my-lessons-by-courses')
  async getUserLessonsGroupedByCourse(@Body('userCourses') userCourses: string[]) {
    return await this.CourseModel.find({ _id: { $in: userCourses } })
      .populate({
        path: 'lessons',
        select: {
          images: 1,
          name: 1,
          shortDescription: 1,
          course: 1,
        },
      })
      .populate({
        path: 'teacher',
        select: {
          name: 1,
          surname: 1,
          roles: 1
        }
      })
  }
}