import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId: string;
  teamId: string;
  type: string;
  minutes: number;
};

type TeamInput = {
  name: string;
  mascot: string;
  members: string[];
};

function requestError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseActivityInput(input: unknown): ActivityInput {
  if (!isRecord(input)) throw requestError('Activity details are required', 400);
  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    !mongoose.isValidObjectId(userId) ||
    typeof teamId !== 'string' ||
    !mongoose.isValidObjectId(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw requestError('Valid userId, teamId, type, and positive minutes are required', 400);
  }
  return { userId, teamId, type: type.trim(), minutes };
}

function parseTeamInput(input: unknown): TeamInput {
  if (!isRecord(input)) throw requestError('Team details are required', 400);
  const { name, mascot, members = [] } = input;
  if (typeof name !== 'string' || !name.trim()) {
    throw requestError('A team name is required', 400);
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw requestError('A team mascot is required', 400);
  }
  if (
    !Array.isArray(members) ||
    !members.every((member): member is string => typeof member === 'string' && mongoose.isValidObjectId(member))
  ) {
    throw requestError('Team members must be valid user IDs', 400);
  }
  return { name: name.trim(), mascot: mascot.trim(), members };
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const { userId, teamId, type, minutes } = parseActivityInput(input);
  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) throw requestError('The specified user or team does not exist', 404);

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const { name, mascot, members } = parseTeamInput(input);
  let previousTeamIds: mongoose.Types.ObjectId[] = [];
  if (members.length > 0) {
    const users = await User.find({ _id: { $in: members } }).select('_id team').lean();
    if (users.length !== members.length) {
      throw requestError('One or more team members do not exist', 404);
    }
    previousTeamIds = users.flatMap((user) => user.team ? [user.team] : []);
  }
  const team = await Team.create({ name, mascot, members });
  if (members.length > 0) {
    await Promise.all([
      previousTeamIds.length > 0
        ? Team.updateMany(
            { _id: { $in: previousTeamIds } },
            { $pull: { members: { $in: members } } },
          )
        : Promise.resolve(),
      User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } }),
    ]);
  }
  return team;
}

export async function getLeaderboard() {
  const teams = await Team.find().lean();
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw requestError('User not found', 404);

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityFocus = recentActivity?.type.toLowerCase();
  const focus = user.fitnessGoal.toLowerCase();
  const matchedFocus = activityFocus && activityFocus.includes(focus) ? activityFocus : focus;
  const workouts = await Workout.find().lean();
  const matching = workouts.filter((workout) => workout.focus.toLowerCase() === matchedFocus);
  const suggestions = matching.length > 0
    ? matching
    : workouts.filter((workout) => activityFocus && workout.focus.toLowerCase() === activityFocus);
  const reason = recentActivity
    ? `Recommended for your ${matchedFocus} goal and recent ${recentActivity.type} activity.`
    : `Recommended to support your ${focus} goal.`;
  return suggestions.map((workout) => ({ ...workout, reason }));
}

export { User };
