'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Question } from '@/lib/types';
import { CheckCircle, Pencil } from 'lucide-react';
import { Button } from '../ui/button';

interface QuestionPreviewProps {
    question: Question;
    index: number;
    onEdit?: () => void;
}

export function QuestionPreview({ question, index, onEdit }: QuestionPreviewProps) {
    
    const getDifficultyColor = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
        switch(difficulty) {
            case 'Easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-secondary';
        }
    }

    return (
        <Card className="bg-background/70 flex-grow">
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-lg">Q{index + 1}: {question.questionText}</CardTitle>
                    <CardDescription className="flex gap-2 mt-2">
                        <Badge variant="outline">{question.skill}</Badge>
                        <Badge className={getDifficultyColor(question.difficulty)}>{question.difficulty}</Badge>
                        <Badge variant="secondary" className="capitalize">{question.type}</Badge>
                    </CardDescription>
                </div>
                 {onEdit && (
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {question.type === 'mcq' && (
                    <div className="space-y-2">
                        {question.options?.map((opt, i) => (
                            <div key={i} className={`text-sm p-2 rounded-md flex items-center gap-2 ${opt === question.correctAnswer ? 'bg-green-500/10 text-green-400' : 'bg-muted/50'}`}>
                                {opt === question.correctAnswer && <CheckCircle className="h-4 w-4" />}
                                <span>{opt}</span>
                            </div>
                        ))}
                    </div>
                )}
                 {question.type === 'short' && (
                    <div className="text-sm p-3 bg-muted/50 rounded-md">
                        <p className="font-semibold">Expected Answer:</p>
                        <p className="italic text-muted-foreground">{question.correctAnswer}</p>
                    </div>
                )}
                 {question.type === 'coding' && (
                    <div className="text-sm space-y-3">
                        {question.starterCode && (
                            <div>
                                <p className="font-semibold mb-1">Starter Code:</p>
                                <pre className="p-2 bg-muted/50 rounded-md whitespace-pre-wrap font-mono text-xs">{question.starterCode}</pre>
                            </div>
                        )}
                        <div>
                             <p className="font-semibold mb-1">Test Cases:</p>
                            <div className="space-y-2">
                                {question.testCases?.map((tc, i) => (
                                     <div key={i} className="p-2 bg-muted/50 rounded-md font-mono text-xs">
                                        <p>Input: <code className="bg-background/80 px-1 rounded">{tc.input}</code></p>
                                        <p>Output: <code className="bg-background/80 px-1 rounded">{tc.expectedOutput}</code></p>
                                     </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
