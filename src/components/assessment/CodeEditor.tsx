
'use client';
import { useState, useTransition } from 'react';
import Editor from '@monaco-editor/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runCode } from '@/ai/flows/run-code-flow';
import type { Question, CodeExecutionResult } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';


const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'r', label: 'R' },
    { value: 'dart', label: 'Dart' },
    { value: 'sql', label: 'SQL' },
];

interface CodeEditorProps {
    question: Question;
    code: string;
    onCodeChange: (code: string) => void;
    language: string;
    onLanguageChange: (language: string) => void;
    executionResult?: CodeExecutionResult[];
    onRunComplete: (result: CodeExecutionResult[]) => void;
}

export function CodeEditor({ question, code, onCodeChange, language, onLanguageChange, executionResult, onRunComplete }: CodeEditorProps) {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState('testcases');
    const { toast } = useToast();

    const handleRunCode = () => {
        startTransition(async () => {
            toast({ title: 'Running Code...', description: 'Please wait while we evaluate your solution.' });
            try {
                const result = await runCode({
                    code,
                    language,
                    testCases: question.testCases || [],
                });
                onRunComplete(result);
                setActiveTab('output');
                toast({ title: 'Execution Finished!', description: 'Check the output panel for results.' });
            } catch (error) {
                console.error('Code execution failed:', error);
                toast({ title: 'Execution Error', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
            }
        });
    }

    const passedCount = executionResult?.filter(r => r.status === 'Passed').length || 0;
    const totalCount = question.testCases?.length || 0;

    return (
        <CardContent className="p-0">
             <ScrollArea className="h-[calc(80vh-180px)] max-h-[700px]">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left Panel: Problem Statement & Test Cases */}
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">{question.questionText}</h2>
                        <Tabs defaultValue="testcases" value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                                <TabsTrigger value="output">Output</TabsTrigger>
                            </TabsList>
                            <TabsContent value="testcases" className="mt-4">
                                <div className="space-y-4">
                                    {question.testCases?.map((tc, index) => (
                                        <div key={index} className="text-sm p-3 bg-muted/50 rounded-md">
                                            <p className="font-semibold">Case {index + 1}</p>
                                            <p><span className="text-muted-foreground">Input:</span> <code className="bg-background/80 px-1 rounded">{tc.input}</code></p>
                                            <p><span className="text-muted-foreground">Expected Output:</span> <code className="bg-background/80 px-1 rounded">{tc.expectedOutput}</code></p>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="output" className="mt-4">
                                {executionResult ? (
                                    <div className="space-y-4">
                                        <div className={`p-3 rounded-md text-lg font-bold flex items-center gap-2 ${passedCount === totalCount ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {passedCount === totalCount ? <CheckCircle /> : <AlertTriangle />}
                                            Result: {passedCount} / {totalCount} Test Cases Passed
                                        </div>
                                        {executionResult.map((result, index) => (
                                            <Card key={index} className={`border-l-4 ${result.status === 'Passed' ? 'border-green-500' : 'border-red-500'}`}>
                                                <CardHeader className="p-3">
                                                    <CardTitle className="text-base flex justify-between items-center">
                                                        <span>Test Case {index + 1}: <span className={result.status === 'Passed' ? 'text-green-500' : 'text-red-500'}>{result.status}</span></span>
                                                        <div className="text-xs text-muted-foreground flex gap-4">
                                                            <span><Clock className="inline h-3 w-3 mr-1" />{result.time}</span>
                                                            <span>{result.memory}</span>
                                                        </div>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-3 pt-0 text-xs">
                                                    <p><span className="font-semibold">Output:</span> <code className="bg-muted/50 px-1 rounded">{result.output}</code></p>
                                                    {result.status !== 'Passed' && <p><span className="font-semibold">Expected:</span> <code className="bg-muted/50 px-1 rounded">{result.expectedOutput}</code></p>}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">
                                        <p>Run your code to see the output here.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Panel: Code Editor */}
                    <div className="lg:h-full flex flex-col lg:border-l min-h-[500px]">
                        <div className="flex-shrink-0 p-2 border-y lg:border-t-0 lg:border-b flex justify-between items-center">
                            <Select value={language} onValueChange={onLanguageChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {languages.map(lang => (
                                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button onClick={handleRunCode} disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                Run Code
                            </Button>
                        </div>
                        <div className="flex-grow">
                            <Editor
                                height="100%"
                                language={language}
                                theme="vs-dark"
                                value={code}
                                onChange={(value) => onCodeChange(value || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </CardContent>
    )
}
