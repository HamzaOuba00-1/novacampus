/**
 * models/courseInstructor.model.ts
 * ---------------------------------------------------------------
 * Table de liaison N:N entre les cours et leurs intervenants.
 *
 * Un cours peut avoir plusieurs enseignants (lead, assistant,
 * substitut). Un enseignant peut intervenir dans plusieurs cours.
 *
 * La clé primaire composite (courseId + instructorId) garantit
 * qu'un enseignant ne peut être lié qu'une seule fois au même cours.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.config';
import { InstructorRole } from '../types';

interface CourseInstructorAttributes {
  courseId: string;
  instructorId: string;
  role: InstructorRole;
  assignedAt?: Date;
}

interface CourseInstructorCreationAttributes
  extends Optional<CourseInstructorAttributes, 'role'> {}

class CourseInstructor
  extends Model<CourseInstructorAttributes, CourseInstructorCreationAttributes>
  implements CourseInstructorAttributes
{
  public courseId!: string;
  public instructorId!: string;
  public role!: InstructorRole;
  public readonly assignedAt!: Date;
}

CourseInstructor.init(
  {
    courseId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    instructorId: {
      // UUID de l'enseignant issu de l'auth-service
      type: DataTypes.UUID,
      primaryKey: true,
    },
    role: {
      type: DataTypes.ENUM('lead', 'assistant', 'substitute'),
      allowNull: false,
      defaultValue: 'assistant',
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'course_instructors',
    timestamps: false,
  }
);

export default CourseInstructor;
