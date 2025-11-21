'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Lightbulb, Briefcase, CheckCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import type { AnalysisSummary } from '@/lib/types';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';

interface PersonalUnderstandingProps {
    analysis?: AnalysisSummary;
    onFlip: () => void;
}

export const PersonalUnderstanding = ({ analysis, onFlip }: PersonalUnderstandingProps) => {
    
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
    
    const readinessData = [{ name: 'Readiness', value: analysis.readinessScore || 0, fill: 'hsl(var(--primary))' }];
    const roleData = analysis.topRoles?.map(r => ({ subject: r.role.split(' ').slice(0,2).join(' '), score: r.score, fullMark: 100 })) || [];

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
        <Card className="w-full h-full rounded-3xl border border-white/10 bg-card/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/40 overflow-y-auto">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants}>
                    <CardHeader className="p-0 flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Target /> Personal Understanding</CardTitle>
                            <CardDescription>AI-powered insights based on your profile.</CardDescription>
                        </div>
                        <Button onClick={onFlip} variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
                        </Button>
                    </CardHeader>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        {roleData.length > 0 && (
                            <Card className="bg-card/50 backdrop-blur-sm h-full">
                                <CardHeader>
                                    <CardTitle className="text-base">Top Role Affinity</CardTitle>
                                </CardHeader>
                                <CardContent className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={roleData}>
                                            <PolarGrid stroke="hsl(var(--border))" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                            <Radar name="Roles" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="md:col-span-1 flex flex-col gap-6">
                         <Card className="bg-card/50 backdrop-blur-sm text-center">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Job Readiness</CardTitle>
                            </CardHeader>
                            <CardContent className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius="60%" 
                                        outerRadius="100%" 
                                        barSize={10} 
                                        data={readinessData}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        <RadialBar
                                            background
                                            dataKey='value'
                                            cornerRadius={10}
                                        />
                                        <text
                                            x="50%"
                                            y="50%"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="fill-primary text-3xl font-bold"
                                        >
                                            {`${analysis.readinessScore}%`}
                                        </text>
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        {analysis.resumeHealth && (
                            <Card className="bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Resume Health</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {Object.entries(analysis.resumeHealth).map(([key, value]) => (
                                        <div key={key} className={`flex items-center gap-2 text-xs ${value ? 'text-green-500' : 'text-amber-500'}`}>
                                            {value ? <CheckCircle className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                                            <span className="capitalize">{key}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {analysis.gapAnalysis && analysis.gapAnalysis.length > 0 && (
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
                    )}

                    {analysis.suggestedLearning && analysis.suggestedLearning.length > 0 && (
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
                    )}
                </motion.div>

            </motion.div>
        </Card>
    )
}
