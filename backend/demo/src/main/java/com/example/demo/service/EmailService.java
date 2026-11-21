package com.example.demo.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:imshan314@gmail.com}")
    private String fromEmail;

    // 1. Existing OTP Email Method (Unchanged & Safe)
    public void sendOtpEmail(String toEmail, String otp) {
        if (mailSender == null) {
            System.out.println(">>> JavaMailSender not configured. OTP for " + toEmail + " is: " + otp);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("OnTime Verification Code");
            message.setText("Your OnTime email verification OTP is: " + otp + "\nValid for 5 minutes.");

            mailSender.send(message);
            System.out.println(">>> OTP Email successfully sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println(">>> Failed to send OTP email: " + e.getMessage());
            System.out.println(">>> Fallback OTP for " + toEmail + " is: " + otp);
        }
    }

    // 2. New Task Assigned Email (HTML Format + Async)
    @Async
    public void sendTaskAssignedEmail(String toEmail, String recipientName, String assignerName, String taskTitle, String boardName, String dueDate, String priority) {
        if (toEmail == null || toEmail.isBlank()) return;

        String subject = "📋 New Task Assigned: " + taskTitle + " (" + boardName + ")";
        String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 550px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;'>"
                + "<div style='background-color: #0d9488; padding: 20px; color: white;'>"
                + "<h2 style='margin: 0; font-size: 18px;'>OnTime Workspace Notification</h2>"
                + "</div>"
                + "<div style='padding: 24px; color: #1e293b;'>"
                + "<p>Hi <b>" + recipientName + "</b>,</p>"
                + "<p><b>@" + assignerName + "</b> has assigned a new task to you on board <b>" + boardName + "</b>:</p>"
                + "<div style='background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 14px; border-radius: 8px; margin: 16px 0;'>"
                + "<p style='margin: 0 0 6px 0; font-size: 16px; font-weight: bold;'>" + taskTitle + "</p>"
                + "<p style='margin: 0; font-size: 13px; color: #64748b;'>Priority: <b>" + (priority != null ? priority : "MEDIUM") + "</b> | Due Date: <b>" + (dueDate != null && !dueDate.isBlank() ? dueDate : "Not Set") + "</b></p>"
                + "</div>"
                + "<a href='http://localhost:5173/dashboard' style='display: inline-block; background-color: #0d9488; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 13px;'>Open OnTime Board</a>"
                + "</div>"
                + "</div>";

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    // 3. Due Date Reminder Email (HTML Format + Async)
    @Async
    public void sendDueDateReminderEmail(String toEmail, String recipientName, String taskTitle, String dueDate, String statusLabel) {
        if (toEmail == null || toEmail.isBlank()) return;

        String subject = "⏰ Task Reminder (" + statusLabel + "): " + taskTitle;
        String badgeColor = "OVERDUE".equalsIgnoreCase(statusLabel) ? "#e11d48" : "#d97706";

        String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 550px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;'>"
                + "<div style='background-color: " + badgeColor + "; padding: 20px; color: white;'>"
                + "<h2 style='margin: 0; font-size: 18px;'>⏰ Task Due Date Alert</h2>"
                + "</div>"
                + "<div style='padding: 24px; color: #1e293b;'>"
                + "<p>Hi <b>" + recipientName + "</b>,</p>"
                + "<p>This is an automated reminder regarding your assigned task:</p>"
                + "<div style='background-color: #f8fafc; border-left: 4px solid " + badgeColor + "; padding: 14px; border-radius: 8px; margin: 16px 0;'>"
                + "<p style='margin: 0 0 6px 0; font-size: 16px; font-weight: bold;'>" + taskTitle + "</p>"
                + "<p style='margin: 0; font-size: 13px; color: #64748b;'>Due Date: <b>" + dueDate + "</b> (<span style='color:" + badgeColor + "; font-weight:bold;'>" + statusLabel + "</span>)</p>"
                + "</div>"
                + "<a href='http://localhost:5173/dashboard' style='display: inline-block; background-color: #1e293b; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 13px;'>View Task</a>"
                + "</div>"
                + "</div>";

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    // Helper method to send HTML emails cleanly
    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (mailSender == null) {
            System.out.println(">>> JavaMailSender not configured. Email to " + to + " | Subject: " + subject);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            System.out.println(">>> HTML Email successfully sent to: " + to + " | Subject: " + subject);
        } catch (Exception e) {
            System.err.println(">>> Failed to send HTML email to " + to + ": " + e.getMessage());
        }
    }
}