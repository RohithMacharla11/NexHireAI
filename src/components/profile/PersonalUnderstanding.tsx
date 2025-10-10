
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, BarChart2, Lightbulb, Briefcase, CheckCircle, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AnalysisSummary } from '@/lib/types';
import { motion } from 'framer-motion';

interface PersonalUnderstandingProps {
    analysis?: AnalysisSummary;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const PersonalUnderstanding = ({ analysis }: PersonalUnderstandingProps) => {
    
    if (!analysis) {
        return (
             <Card className="bg-card/50 backdrop-blur-sm border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target /> Personal Understanding</CardTitle>
                    <CardDescription>Complete your profile and resume to unlock insights.</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    <p>This panel will provide AI-driven insights into your career profile.</p>
                </CardContent>
            </Card>
        )
    }
    
    const readinessData = [{ name: 'Readiness', value: analysis.readinessScore || 0 }];
    const skillData = analysis.topRoles?.map(r => ({ subject: r.role.split(' ').slice(0,2).join(' '), A: r.score, fullMark: 100 })) || [];

    const containerVariants = {
        hidden: { opacity: 1 },
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
        },
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Target /> Personal Understanding</CardTitle>
                        <CardDescription>AI-powered insights based on your profile.</CardDescription>
                    </CardHeader>
                </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 text-center">
                 <Card className="bg-card/50 backdrop-blur-sm p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Readiness</h4>
                    <p className="text-2xl font-bold text-primary">{analysis.readinessScore || 0}%</p>
                </Card>
                 <Card className="bg-card/50 backdrop-blur-sm p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Top Role</h4>
                    <p className="text-lg font-bold truncate">{analysis.topRoles?.[0]?.role || 'N/A'}</p>
                </Card>
            </motion.div>

            {analysis.topRoles && analysis.topRoles.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2"><BarChart2 /> Top Role Matches</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analysis.topRoles.map(role => (
                                <div key={role.role}>
                                    <div className="flex justify-between mb-1">
                                        <p className="text-sm font-medium">{role.role}</p>
                                        <p className="text-sm text-primary">{role.score}%</p>
                                    </div>
                                    <Progress value={role.score} className="h-2" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
            
            {skillData.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Skill Radar</CardTitle>
                        </CardHeader>
                        <CardContent className="h-60">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="Roles" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {analysis.gapAnalysis && analysis.gapAnalysis.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2"><Lightbulb /> Gap Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {analysis.gapAnalysis.map(gap => <li key={gap}>{gap}</li>)}
                            </ul>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {analysis.suggestedLearning && analysis.suggestedLearning.length > 0 && (
                <motion.div variants={itemVariants}>
                     <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2"><Briefcase /> Suggested Learning</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           {analysis.suggestedLearning.map(item => (
                               <div key={item.task} className="text-sm p-2 bg-background/50 rounded-md">
                                   <p className="font-semibold">{item.task}</p>
                                   <p className="text-xs text-muted-foreground">Est. {item.estWeeks} weeks</p>
                               </div>
                           ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
            
            {analysis.resumeHealth && (
                 <motion.div variants={itemVariants}>
                     <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">Resume Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(analysis.resumeHealth).map(([key, value]) => (
                                <div key={key} className={`flex items-center gap-2 text-sm ${value ? 'text-green-500' : 'text-amber-500'}`}>
                                    {value ? <CheckCircle className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                                    <span className="capitalize">{key}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </motion.div>
    )
}
