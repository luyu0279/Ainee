"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/toast';
import { KnowledgeBaseVisibility } from '@/apis/models/KnowledgeBaseVisibility';
import { ACCESS_OPTIONS } from '@/types/knowledgeBase';
import { KnowledgeBaseService } from '@/apis/services/KnowledgeBaseService';
import { useHttpRequest } from '@/hooks/useHttpRequest';
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { useContext } from 'react';
import ApiLibs from '@/lib/ApiLibs';

const formSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(300, 'Description must be less than 300 characters'),
  visibility: z.nativeEnum(KnowledgeBaseVisibility),
  kb_uid: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  initialData?: FormData;
  subscriberCount?: number;
  onSuccess?: (newKbId: string) => void;
}

export default function KnowledgeBaseForm({ initialData, subscriberCount = 0, onSuccess }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const httpRequest = useHttpRequest();
  const [dialogOpen, setDialogOpen] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      visibility: KnowledgeBaseVisibility.DEFAULT,
      kb_uid: undefined
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      if (initialData?.kb_uid) {
        // Update existing knowledge base
        const response = await ApiLibs.knowledgeBase.updateKnowledgeBaseApiKbUpdatePost({
          kb_uid: initialData.kb_uid,
          name: data.name,
          description: data.description,
          visibility: data.visibility,
        });
        
        if (response.data) {
          toast.success("Knowledge base updated successfully");
          setDialogOpen(false);
          onSuccess?.(initialData.kb_uid);
          router.refresh();
        } else {
          throw new Error(response.message || "Failed to update knowledge base");
        }
      } else {
        // Create new knowledge base
        const response = await ApiLibs.knowledgeBase.saveKnowledgeBaseApiKbCreatePost({
          name: data.name,
          description: data.description,
          visibility: data.visibility,
        });
        
        if (response.data) {
          const newKbId = response.data.uid;
          toast.success("Knowledge base created successfully");
          
          // 先关闭对话框
          setDialogOpen(false);
          
          // 稍等一下再触发回调，给后端更多时间处理
          setTimeout(() => {
            // 确保有 newKbId 后，再调用 onSuccess
            if (newKbId) {
              console.log('Created KB with ID:', newKbId);
              onSuccess?.(newKbId);
              router.refresh();
            }
          }, 300);
        } else {
          throw new Error(response.message || "Failed to create knowledge base");
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (error.response?.data?.detail === "Not authenticated") {
        toast.error("Please log in to create a knowledge base");
        // 可以选择重定向到登录页面
        // router.push('/login');
      } else {
        toast.error(error.message || "Failed to save knowledge base. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Knowledge Base Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter knowledge base name" 
                    {...field} 
                    maxLength={100}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Knowledge Base Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter knowledge base description" 
                    {...field}
                    maxLength={300}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Public Access Settings</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="space-y-4"
                  >
                    {ACCESS_OPTIONS.map((option) => {
                      const isPrivateDisabled = 
                        option.value === KnowledgeBaseVisibility.PRIVATE && 
                        subscriberCount > 0 && 
                        initialData?.visibility !== KnowledgeBaseVisibility.PRIVATE;

                      return (
                        <FormItem
                          key={option.value}
                          className="flex items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={option.value}
                              disabled={isPrivateDisabled}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-normal">
                              {option.label}
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              {option.description}
                            </p>
                            {isPrivateDisabled && (
                              <p className="text-sm text-yellow-600">
                                Cannot change to Private when there are subscribers
                              </p>
                            )}
                          </div>
                        </FormItem>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </Form>
    </Dialog>
  );
} 